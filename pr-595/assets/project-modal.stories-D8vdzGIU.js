import{a_ as n,ax as R}from"./iframe-CgkUxXSp.js";import{c as N,q as x,k as B,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-BqVtqO9Z.js";import{P as H}from"./project-modal-BdjQx-sw.js";import"./preload-helper-Dp1pzeXC.js";import"./index-CvRymjnP.js";import"./Select-ef7c0426.esm-Bj9LFYDk.js";import"./chevron-down-BmyIY-zi.js";import"./check-D8GZnS6Z.js";import"./index-Ddc5NNOG.js";import"./export-menu-DsLOlUys.js";import"./client-CNCAvq87.js";import"./markdown-preview-DxrHVRni.js";import"./index.dom-D_wTd2ti.js";import"./file-text-CeEXfuB1.js";import"./copy-Dveas0cJ.js";import"./file-code-corner-CnUOMaas.js";import"./loader-circle-a_Yp-6Vx.js";import"./api-CuiKGkET.js";import"./folder-open-oxaJO69i.js";import"./folder-Dak70-zn.js";import"./tag-color-picker-DGZNiK_9.js";import"./project-tag-BAt6Dq-D.js";import"./sparkles-Xmm42iG_.js";import"./brain-m_1-GsyA.js";import"./chevron-right-D_wzeZgp.js";import"./markdown-editor-DVDVrxOE.js";import"./pencil-Do1DtE36.js";import"./trash-2-C1omUTGI.js";import"./templates-dCnf9par.js";import"./project-template-labels-zW-DjTf9.js";import"./plus-IU2n7M9b.js";import"./task-row-PEj58PU_.js";import"./blocked-badge-yTpqrWtr.js";import"./selectable-icon-B1IsBPpQ.js";import"./hover-expand-button-DkiNq0N3.js";import"./index-96-Q3YMH.js";import"./data-refresh-BMDDjfk7.js";import"./rotate-ccw-B3m3UYqp.js";import"./play-BFSjgJ1k.js";import"./square-terminal-CmtR-RqN.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-Bwucgadg.js";var s,c,p,m,l,d,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ha={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[x,B],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[x,B]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
}`,...(p=o.parameters)===null||p===void 0||(c=p.docs)===null||c===void 0?void 0:c.source},description:{story:"Creating a project — empty form under the Details tab.",...(l=o.parameters)===null||l===void 0||(m=l.docs)===null||m===void 0?void 0:m.description}}};i.parameters={...i.parameters,docs:{...(d=i.parameters)===null||d===void 0?void 0:d.docs,source:{originalSource:`{
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
}`,...(T=r.parameters)===null||T===void 0||(y=T.docs)===null||y===void 0?void 0:y.source},description:{story:"The tablist switches sections; selecting Plan marks that tab selected.",...(b=r.parameters)===null||b===void 0||(E=b.docs)===null||E===void 0?void 0:E.description}}};const fa=["New","Edit","SwitchTab"];export{i as Edit,o as New,r as SwitchTab,fa as __namedExportsOrder,ha as default};
