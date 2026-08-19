import{b1 as n,ay as R}from"./iframe-C9h0ttrh.js";import{c as N,q as B,k as x,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-Dc0xN1nM.js";import{P as H}from"./project-modal-BhhW4IXk.js";import"./preload-helper-Dp1pzeXC.js";import"./index-BvhVIVWc.js";import"./Select-ef7c0426.esm-DqoSHntW.js";import"./chevron-down-BlzvwwV3.js";import"./check-CPgmd7PC.js";import"./export-menu-j_Vw8WHa.js";import"./client-DYOHvVgk.js";import"./markdown-preview-xrrPjsmz.js";import"./index.dom-D_wTd2ti.js";import"./copy-GFnO8x83.js";import"./file-code-corner-jRrY6UC3.js";import"./file-text-BtGRH9Co.js";import"./loader-circle-qAJLYWB5.js";import"./api-BmZNK2cC.js";import"./folder-open-Djzl5T3M.js";import"./folder-NsgKr92t.js";import"./tag-color-picker-1GVEMV4d.js";import"./project-tag-DLIU83r3.js";import"./sparkles-C2HLgPXw.js";import"./brain-BVwnGqEX.js";import"./chevron-right-BWw49OP4.js";import"./markdown-editor-BUgkqv_F.js";import"./pencil-CyU925lo.js";import"./trash-2-BIsFNROr.js";import"./templates-U7pzACKw.js";import"./project-template-labels-DHok6AFc.js";import"./plus-CAxyA9gm.js";import"./task-row-BTraCLlv.js";import"./blocked-badge-B7fkYj_o.js";import"./selectable-icon-Dap_pHUM.js";import"./hover-expand-button-DtTCFCaj.js";import"./index-Cym9Ylcn.js";import"./data-refresh-DqPAmBAh.js";import"./rotate-ccw-B1a1fgjx.js";import"./play-DUjNSWF5.js";import"./square-terminal-DnILHVpc.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-Dtqyfl6Q.js";var s,c,p,l,m,d,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ja={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[B,x]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
  args: {
    project: null
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'New project'
    });
    await expect(within(dialog).getByLabelText('Title')).toHaveValue('');
  }
}`,...(p=o.parameters)===null||p===void 0||(c=p.docs)===null||c===void 0?void 0:c.source},description:{story:"Creating a project — empty form under the Details tab.",...(m=o.parameters)===null||m===void 0||(l=m.docs)===null||l===void 0?void 0:l.description}}};i.parameters={...i.parameters,docs:{...(d=i.parameters)===null||d===void 0?void 0:d.docs,source:{originalSource:`{
  args: {
    project,
    tasks: [taskFeature, taskBug],
    memories: [memoryProjectScoped],
    onSelectTask: fn()
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'Edit project'
    });
    await expect(within(dialog).getByLabelText('Title')).toHaveValue(project.name);
  }
}`,...(u=i.parameters)===null||u===void 0||(v=u.docs)===null||v===void 0?void 0:v.source},description:{story:"Editing a project — fields pre-filled, with tasks + a scoped memory surfaced.",...(w=i.parameters)===null||w===void 0||(_=w.docs)===null||_===void 0?void 0:_.description}}};r.parameters={...r.parameters,docs:{...(g=r.parameters)===null||g===void 0?void 0:g.docs,source:{originalSource:`{
  args: {
    project,
    tasks: [taskFeature, taskBug]
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'Edit project'
    });
    const planTab = within(dialog).getByRole('tab', {
      name: /plan/i
    });
    await userEvent.click(planTab);
    await expect(planTab).toHaveAttribute('aria-selected', 'true');
  }
}`,...(T=r.parameters)===null||T===void 0||(y=T.docs)===null||y===void 0?void 0:y.source},description:{story:"The tablist switches sections; selecting Plan marks that tab selected.",...(b=r.parameters)===null||b===void 0||(E=b.docs)===null||E===void 0?void 0:E.description}}};const ha=["New","Edit","SwitchTab"];export{i as Edit,o as New,r as SwitchTab,ha as __namedExportsOrder,ja as default};
