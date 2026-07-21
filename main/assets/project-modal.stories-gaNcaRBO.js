import{l as n,T as R}from"./iframe-CwktqEBX.js";import{c as N,q as B,k as x,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-1gchad-V.js";import{P as H}from"./project-modal-CoNQYncU.js";import"./preload-helper-Dp1pzeXC.js";import"./index-DTBfnkv9.js";import"./index-BDiFekjL.js";import"./Select-ef7c0426.esm-DDDnBsy0.js";import"./chevron-down-DGQAhRwB.js";import"./check-BNxS9ALI.js";import"./triangle-alert-HLCF9Dyy.js";import"./export-menu-CxyjSe4T.js";import"./client-BoXXc-4F.js";import"./markdown-preview-BX2GUibj.js";import"./index.dom-D_wTd2ti.js";import"./file-text-CHrc0aYJ.js";import"./copy-DrLYlzjQ.js";import"./file-code-corner-WbFJqC6Q.js";import"./loader-circle-vviNHE4K.js";import"./api-Dm0saTli.js";import"./site-links-pM9JTGsI.js";import"./folder-open-Ckcc_o16.js";import"./folder-DfKFUaoM.js";import"./tag-color-picker-2xs2ob87.js";import"./project-tag-xXy7Qo_c.js";import"./sparkles-qSEwrMhh.js";import"./brain-DsrP8ng_.js";import"./chevron-right-DpZAYAp8.js";import"./markdown-editor-vy2-McYa.js";import"./pencil-BLPsRn6j.js";import"./trash-2-BFO3eg7p.js";import"./templates-B6M1OYb3.js";import"./plus-JpK97ifT.js";import"./task-row-CabQuexv.js";import"./blocked-badge-DIKQ7W2A.js";import"./selectable-icon-CEkDGkcF.js";import"./task-columns-DXf2yYcn.js";import"./refresh-cw-CNqjunyA.js";import"./arrow-left-BBAa_eGU.js";var s,c,p,l,d,m,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,Ta={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[B,x]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
}`,...(p=o.parameters)===null||p===void 0||(c=p.docs)===null||c===void 0?void 0:c.source},description:{story:"Creating a project — empty form under the Details tab.",...(d=o.parameters)===null||d===void 0||(l=d.docs)===null||l===void 0?void 0:l.description}}};i.parameters={...i.parameters,docs:{...(m=i.parameters)===null||m===void 0?void 0:m.docs,source:{originalSource:`{
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
}`,...(T=r.parameters)===null||T===void 0||(y=T.docs)===null||y===void 0?void 0:y.source},description:{story:"The tablist switches sections; selecting Plan marks that tab selected.",...(b=r.parameters)===null||b===void 0||(E=b.docs)===null||E===void 0?void 0:E.description}}};const Ea=["New","Edit","SwitchTab"];export{i as Edit,o as New,r as SwitchTab,Ea as __namedExportsOrder,Ta as default};
